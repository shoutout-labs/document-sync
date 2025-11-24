import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GeminiService } from './geminiService';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "file-sync" is now active!');

    const outputChannel = vscode.window.createOutputChannel("Gemini File Sync");
    context.subscriptions.push(outputChannel);

    // --- Helper Functions ---
    const getApiKey = async (): Promise<string | undefined> => {
        let apiKey = await context.secrets.get('geminiApiKey');
        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Gemini API Key to enable File Sync',
                ignoreFocusOut: true,
                password: true
            });
            if (apiKey) {
                await context.secrets.store('geminiApiKey', apiKey);
            }
        }
        return apiKey;
    };

    // --- Settings Manager ---
    interface GeminiSettings {
        projectName?: string;
        watchLocation?: string;
    }

    class SettingsManager {
        private static getSettingsPath(): string | undefined {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                return undefined;
            }
            return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'document-sync.json');
        }

        static async loadSettings(): Promise<GeminiSettings> {
            const settingsPath = this.getSettingsPath();
            if (!settingsPath || !fs.existsSync(settingsPath)) {
                return {};
            }
            try {
                const content = await fs.promises.readFile(settingsPath, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                console.error('Failed to load settings:', error);
                return {};
            }
        }

        static async updateSetting(key: keyof GeminiSettings, value: string | undefined): Promise<void> {
            const settingsPath = this.getSettingsPath();
            if (!settingsPath) {
                return;
            }

            let settings = await this.loadSettings();
            if (value === undefined) {
                delete settings[key];
            } else {
                settings[key] = value;
            }

            try {
                await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to save settings to document-sync.json: ${error}`);
            }
        }
    }

    const getWatchLocation = async (promptForSync: boolean = true): Promise<vscode.Uri | undefined> => {
        let settings = await SettingsManager.loadSettings();
        let watchPath = settings.watchLocation;

        if (!watchPath) {
            const folderResult = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Folder to Watch',
                defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined
            });

            if (folderResult && folderResult.length > 0) {
                // Convert absolute path to relative path from workspace root
                const selectedPath = folderResult[0].fsPath;
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    if (selectedPath.startsWith(workspaceRoot)) {
                        watchPath = path.relative(workspaceRoot, selectedPath);
                        // Normalize path separators to forward slashes
                        watchPath = watchPath.split(path.sep).join('/');
                    } else {
                        // If selected path is outside workspace, store as absolute (fallback)
                        watchPath = selectedPath;
                    }
                } else {
                    // No workspace folder, store as absolute (fallback)
                    watchPath = selectedPath;
                }
                await SettingsManager.updateSetting('watchLocation', watchPath);
                
                // Check if all settings are complete and prompt for sync (if not called from getProjectName)
                if (promptForSync) {
                    await checkAndPromptSync();
                }
            }
        }
        
        // Convert relative path back to absolute path
        if (watchPath) {
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                // Check if it's already an absolute path (backward compatibility)
                if (path.isAbsolute(watchPath)) {
                    return vscode.Uri.file(watchPath);
                } else {
                    // It's a relative path, join with workspace root
                    const absolutePath = path.join(workspaceRoot, watchPath);
                    return vscode.Uri.file(absolutePath);
                }
            } else {
                // No workspace folder, assume it's absolute (backward compatibility)
                return vscode.Uri.file(watchPath);
            }
        }
        return undefined;
    };

    const checkAndPromptSync = async (): Promise<void> => {
        const apiKey = await context.secrets.get('geminiApiKey');
        const settings = await SettingsManager.loadSettings();
        const allSettingsComplete = apiKey && settings.projectName && settings.watchLocation;

        if (allSettingsComplete) {
            const selection = await vscode.window.showInformationMessage(
                `All settings are configured. Would you like to sync documents now?`,
                'Sync Now',
                'Later'
            );

            if (selection === 'Sync Now') {
                // Defer command execution to ensure the command is registered
                // This is needed because checkAndPromptSync can be called during startup
                // before all commands are registered
                setTimeout(async () => {
                    try {
                        await vscode.commands.executeCommand('geminiFileSearch.sync');
                    } catch (error: any) {
                        // If command execution fails, show a helpful message
                        vscode.window.showErrorMessage(`Failed to start sync: ${error?.message || error || 'Unknown error'}`);
                    }
                }, 100);
            }
        }
    };

    const getProjectName = async (): Promise<string | undefined> => {
        let settings = await SettingsManager.loadSettings();
        let projectName = settings.projectName;

        if (!projectName) {
            // Get existing projects from Gemini API
            let existingProjects: string[] = [];
            try {
                const apiKey = await context.secrets.get('geminiApiKey');
                if (apiKey) {
                    const geminiService = new GeminiService(apiKey);
                    existingProjects = await geminiService.listFileStores();
                }
            } catch (error) {
                console.warn('Failed to fetch existing projects:', error);
            }

            // If there are existing projects, show QuickPick with autocomplete
            if (existingProjects.length > 0) {
                const quickPick = vscode.window.createQuickPick();
                quickPick.placeholder = 'Type to search existing projects or create a new one...';
                quickPick.items = [
                    { label: '$(add) Create new project...', description: 'Enter a new project name', alwaysShow: true },
                    ...existingProjects.map(name => ({ label: name }))
                ];
                quickPick.canSelectMany = false;

                // Show the QuickPick and wait for selection
                const selected = await new Promise<{ item: vscode.QuickPickItem | undefined; typedValue: string }>((resolve) => {
                    let finalTypedValue = '';
                    quickPick.onDidChangeValue((value) => {
                        finalTypedValue = value;
                    });

                    quickPick.onDidAccept(() => {
                        const selectedItem = quickPick.selectedItems[0];
                        const currentValue = quickPick.value || finalTypedValue;
                        
                        if (selectedItem) {
                            resolve({ item: selectedItem, typedValue: currentValue });
                        } else if (currentValue && !existingProjects.includes(currentValue)) {
                            // User typed something new that doesn't match any project, use it directly
                            resolve({ item: { label: currentValue } as vscode.QuickPickItem, typedValue: currentValue });
                        } else {
                            resolve({ item: undefined, typedValue: currentValue });
                        }
                        quickPick.dispose();
                    });
                    quickPick.onDidHide(() => {
                        resolve({ item: undefined, typedValue: '' });
                        quickPick.dispose();
                    });
                    quickPick.show();
                });

                if (selected.item) {
                    if (selected.item.label === '$(add) Create new project...') {
                        // If user typed a value, use it directly (after validation)
                        const typedValue = selected.typedValue.trim();
                        if (typedValue && typedValue.length > 0 && !existingProjects.includes(typedValue)) {
                            projectName = typedValue;
                        } else {
                            // Show input box for new project name (pre-fill with typed value if available)
                            projectName = await vscode.window.showInputBox({
                                prompt: 'Enter a Project Name for Gemini File Sync',
                                ignoreFocusOut: true,
                                placeHolder: 'My Awesome Project',
                                value: typedValue || undefined,
                                validateInput: (value) => {
                                    if (!value || value.trim().length === 0) {
                                        return 'Project name cannot be empty';
                                    }
                                    if (existingProjects.includes(value.trim())) {
                                        return 'A project with this name already exists';
                                    }
                                    return null;
                                }
                            });
                        }
                    } else {
                        // Use selected existing project or typed new project name
                        projectName = selected.item.label;
                    }
                }
            } else {
                // No existing projects, just show input box
                projectName = await vscode.window.showInputBox({
                    prompt: 'Enter a Project Name for Gemini File Sync',
                    ignoreFocusOut: true,
                    placeHolder: 'My Awesome Project'
                });
            }

            if (projectName) {
                await SettingsManager.updateSetting('projectName', projectName);
                
                // Automatically prompt for watch location if not set
                const updatedSettings = await SettingsManager.loadSettings();
                if (!updatedSettings.watchLocation) {
                    await getWatchLocation(false); // Don't prompt for sync here, we'll do it after
                }
                
                // Check if all settings are complete and prompt for sync
                await checkAndPromptSync();
            }
        }
        return projectName;
    };

    // --- Startup Logic ---
    const apiKey = await getApiKey();
    if (!apiKey) {
        vscode.window.showWarningMessage('Gemini File Sync: API Key not provided. Sync features disabled.');
    }

    const projectName = await getProjectName();
    if (projectName) {
        outputChannel.appendLine(`Active Project: ${projectName}`);
    }

    const watchUri = await getWatchLocation();
    if (watchUri) {
        const settings = await SettingsManager.loadSettings();
        const watchPath = settings.watchLocation || watchUri.fsPath;
        // Display relative path if available, otherwise absolute
        const displayPath = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 && !path.isAbsolute(watchPath))
            ? watchPath
            : vscode.workspace.asRelativePath(watchUri);
        outputChannel.appendLine(`Watching Location: ${displayPath}`);
    }

    // --- File Tracking Helpers ---
    interface FileMetadata {
        mtime: number;
        documentName: string;
    }

    const getFileMetadataKey = (projectName: string): string => {
        return `geminiFileSync_${projectName}_metadata`;
    };

    const loadFileMetadata = async (projectName: string): Promise<Map<string, FileMetadata>> => {
        const key = getFileMetadataKey(projectName);
        const stored = context.workspaceState.get<Record<string, FileMetadata>>(key);
        if (!stored) {
            return new Map();
        }
        return new Map(Object.entries(stored));
    };

    const saveFileMetadata = async (projectName: string, metadata: Map<string, FileMetadata>): Promise<void> => {
        const key = getFileMetadataKey(projectName);
        const obj = Object.fromEntries(metadata);
        await context.workspaceState.update(key, obj);
    };

    // --- File Watcher ---
    let watcher: vscode.FileSystemWatcher | undefined;
    if (watchUri) {
        // Create a relative pattern if possible, or just watch the path
        const pattern = new vscode.RelativePattern(watchUri, '**/*');
        watcher = vscode.workspace.createFileSystemWatcher(pattern);

        const onFileChange = async (uri: vscode.Uri) => {
            // Ignore node_modules and hidden files/directories
            if (uri.path.includes('node_modules') || uri.path.includes('/.')) {
                return;
            }

            // Ignore the settings file itself to prevent loops if we were watching root
            if (uri.fsPath.endsWith('document-sync.json')) {
                return;
            }

            const settings = await SettingsManager.loadSettings();
            const currentProjectName = settings.projectName || 'Project';

            const selection = await vscode.window.showInformationMessage(
                `File changes detected in ${currentProjectName}.`,
                'Sync Now'
            );

            if (selection === 'Sync Now') {
                vscode.commands.executeCommand('geminiFileSearch.sync');
            }
        };

        const onFileDelete = async (uri: vscode.Uri) => {
            // Ignore node_modules and hidden files/directories
            if (uri.path.includes('node_modules') || uri.path.includes('/.')) {
                return;
            }

            // Ignore the settings file itself
            if (uri.fsPath.endsWith('document-sync.json')) {
                return;
            }

            const settings = await SettingsManager.loadSettings();
            const currentProjectName = settings.projectName || 'Project';
            
            // Calculate relative path from watch location or workspace
            let relativePath: string;
            if (watchUri) {
                const watchPath = watchUri.fsPath;
                const filePath = uri.fsPath;
                if (filePath.startsWith(watchPath)) {
                    relativePath = path.relative(watchPath, filePath);
                    // Normalize path separators
                    relativePath = relativePath.split(path.sep).join('/');
                } else {
                    relativePath = vscode.workspace.asRelativePath(uri);
                }
            } else {
                relativePath = vscode.workspace.asRelativePath(uri);
            }

            // Check if this file was tracked
            const fileMetadata = await loadFileMetadata(currentProjectName);
            const trackedFile = fileMetadata.get(relativePath);

            if (trackedFile && trackedFile.documentName) {
                // Ask user for permission to delete from store
                const selection = await vscode.window.showInformationMessage(
                    `File ${relativePath} was deleted. Do you want to remove it from the store?`,
                    'Delete from Store',
                    'Cancel'
                );

                if (selection === 'Delete from Store') {
                    try {
                        const apiKey = await context.secrets.get('geminiApiKey');
                        if (apiKey) {
                            const geminiService = new GeminiService(apiKey);
                            outputChannel.appendLine(`Deleting ${relativePath} from store...`);
                            await geminiService.deleteDocument(trackedFile.documentName);
                            fileMetadata.delete(relativePath);
                            await saveFileMetadata(currentProjectName, fileMetadata);
                            outputChannel.appendLine(`Deleted ${relativePath} from store.`);
                            vscode.window.showInformationMessage(`Deleted ${relativePath} from store.`);
                        }
                    } catch (error) {
                        const errorMsg = `Failed to delete ${relativePath} from store: ${error}`;
                        outputChannel.appendLine(errorMsg);
                        vscode.window.showWarningMessage(errorMsg);
                    }
                }
            }
        };

        context.subscriptions.push(watcher.onDidChange(onFileChange));
        context.subscriptions.push(watcher.onDidCreate(onFileChange));
        context.subscriptions.push(watcher.onDidDelete(onFileDelete));
    }


    // --- Tree Data Provider ---
    class GeminiTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
        private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
        readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

        refresh(): void {
            this._onDidChangeTreeData.fire();
        }

        getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
            return element;
        }

        async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
            if (element) {
                return [];
            }

            const apiKey = await context.secrets.get('geminiApiKey');
            if (!apiKey) {
                const loginItem = new vscode.TreeItem("Login to Gemini", vscode.TreeItemCollapsibleState.None);
                loginItem.command = { command: 'geminiFileSearch.login', title: "Login" };
                loginItem.iconPath = new vscode.ThemeIcon('sign-in');
                return [loginItem];
            }

            const syncItem = new vscode.TreeItem("Sync Now", vscode.TreeItemCollapsibleState.None);
            syncItem.command = { command: 'geminiFileSearch.sync', title: "Sync Now" };
            syncItem.iconPath = new vscode.ThemeIcon('sync');

            const projectItem = new vscode.TreeItem("Change Project Name", vscode.TreeItemCollapsibleState.None);
            projectItem.command = { command: 'geminiFileSearch.changeProject', title: "Change Project Name" };
            projectItem.iconPath = new vscode.ThemeIcon('edit');

            const watchItem = new vscode.TreeItem("Change Watch Location", vscode.TreeItemCollapsibleState.None);
            watchItem.command = { command: 'geminiFileSearch.changeWatchLocation', title: "Change Watch Location" };
            watchItem.iconPath = new vscode.ThemeIcon('folder');

            const updateApiKeyItem = new vscode.TreeItem("Update API Key", vscode.TreeItemCollapsibleState.None);
            updateApiKeyItem.command = { command: 'geminiFileSearch.updateApiKey', title: "Update API Key" };
            updateApiKeyItem.iconPath = new vscode.ThemeIcon('key');

            return [syncItem, projectItem, watchItem, updateApiKeyItem];
        }
    }

    const treeDataProvider = new GeminiTreeDataProvider();
    vscode.window.registerTreeDataProvider('gemini-sync-view', treeDataProvider);


    // --- Command Registration ---
    context.subscriptions.push(vscode.commands.registerCommand('geminiFileSearch.login', async () => {
        await getApiKey();
        treeDataProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('geminiFileSearch.changeProject', async () => {
        await SettingsManager.updateSetting('projectName', undefined); // Clear to force prompt
        await getProjectName();
        treeDataProvider.refresh();
        // checkAndPromptSync is already called in getProjectName
    }));

    context.subscriptions.push(vscode.commands.registerCommand('geminiFileSearch.changeWatchLocation', async () => {
        await SettingsManager.updateSetting('watchLocation', undefined); // Clear to force prompt
        await getWatchLocation();
        vscode.window.showInformationMessage("Watch location updated. Reload window to apply watcher changes fully.");
        treeDataProvider.refresh();
        // checkAndPromptSync is already called in getWatchLocation
    }));

    context.subscriptions.push(vscode.commands.registerCommand('geminiFileSearch.updateApiKey', async () => {
        const newApiKey = await vscode.window.showInputBox({
            prompt: 'Enter your new Gemini API Key',
            ignoreFocusOut: true,
            password: true
        });
        if (newApiKey) {
            await context.secrets.store('geminiApiKey', newApiKey);
            vscode.window.showInformationMessage('API Key updated successfully.');
            treeDataProvider.refresh();
            // Check if all settings are complete and prompt for sync
            await checkAndPromptSync();
        }
    }));

    let disposable = vscode.commands.registerCommand('geminiFileSearch.sync', async () => {
        outputChannel.show();
        outputChannel.appendLine('Starting sync process...');

        // 1. Get API Key (Retry if missing)
        let apiKey = await context.secrets.get('geminiApiKey');
        if (!apiKey) {
            apiKey = await getApiKey();
            if (!apiKey) {
                vscode.window.showErrorMessage('API Key is required to sync files.');
                outputChannel.appendLine('API Key is required to sync files.');
                return;
            }
        }
        treeDataProvider.refresh(); // Refresh in case we just logged in

        // 2. Determine Folder to Sync (Use Watch Location if available, else prompt)
        let folderUri: vscode.Uri | undefined;
        const settings = await SettingsManager.loadSettings();
        const storedWatchPath = settings.watchLocation;

        if (storedWatchPath) {
            // Convert relative path back to absolute path
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                // Check if it's already an absolute path (backward compatibility)
                if (path.isAbsolute(storedWatchPath)) {
                    folderUri = vscode.Uri.file(storedWatchPath);
                } else {
                    // It's a relative path, join with workspace root
                    const absolutePath = path.join(workspaceRoot, storedWatchPath);
                    folderUri = vscode.Uri.file(absolutePath);
                }
            } else {
                // No workspace folder, assume it's absolute (backward compatibility)
                folderUri = vscode.Uri.file(storedWatchPath);
            }
        } else {
            const folderResult = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Folder to Sync',
                defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined
            });

            if (!folderResult || folderResult.length === 0) {
                outputChannel.appendLine('No folder selected. Sync cancelled.');
                return;
            }
            folderUri = folderResult[0];
        }

        // 3. Initialize Gemini Service
        try {
            const geminiService = new GeminiService(apiKey);
            const currentProjectName = settings.projectName || 'Project';

            vscode.window.showInformationMessage(`Syncing files from ${folderUri.fsPath} to File Store '${currentProjectName}'...`);
            outputChannel.appendLine(`Selected folder: ${folderUri.fsPath}`);
            outputChannel.appendLine(`Target File Store: ${currentProjectName}`);

            // Get or Create File Store
            outputChannel.appendLine(`Ensuring File Store '${currentProjectName}' exists...`);
            const storeName = await geminiService.getOrCreateFileSearchStore(currentProjectName);
            outputChannel.appendLine(`Using File Store: ${storeName}`);

            // Load existing file metadata
            const fileMetadata = await loadFileMetadata(currentProjectName);
            outputChannel.appendLine(`Loaded metadata for ${fileMetadata.size} previously synced files.`);

            // Get list of documents currently in the store
            outputChannel.appendLine('Fetching documents from store...');
            const storeDocuments = await geminiService.listDocuments(storeName);
            const storeDocumentsByDisplayName = new Map<string, string>();
            for (const doc of storeDocuments) {
                if (doc.displayName) {
                    storeDocumentsByDisplayName.set(doc.displayName, doc.name);
                }
            }
            outputChannel.appendLine(`Found ${storeDocumentsByDisplayName.size} documents in store.`);

            // Sync metadata with store: if a file exists in store but not in metadata, add it
            // This handles cases where metadata was lost or is out of sync
            for (const [displayName, documentName] of storeDocumentsByDisplayName) {
                if (!fileMetadata.has(displayName)) {
                    // File exists in store but not in metadata - we'll update metadata after checking local file
                    outputChannel.appendLine(`File ${displayName} exists in store but not in metadata - will sync`);
                }
            }

            // Find local files
            const localFiles = await findFiles(folderUri);
            if (localFiles.length === 0) {
                const msg = 'No supported files found to sync.';
                vscode.window.showInformationMessage(msg);
                outputChannel.appendLine(msg);
            }

            // Build map of local files by relative path
            const localFilesByPath = new Map<string, { uri: vscode.Uri; mtime: number }>();
            const folderPath = folderUri.fsPath;
            for (const file of localFiles) {
                // Calculate relative path from folderUri (watch location)
                let relativePath: string;
                const filePath = file.fsPath;
                if (filePath.startsWith(folderPath)) {
                    relativePath = path.relative(folderPath, filePath);
                    // Normalize path separators
                    relativePath = relativePath.split(path.sep).join('/');
                } else {
                    relativePath = vscode.workspace.asRelativePath(file);
                }
                try {
                    const stats = await fs.promises.stat(file.fsPath);
                    localFilesByPath.set(relativePath, { uri: file, mtime: stats.mtimeMs });
                } catch (err) {
                    outputChannel.appendLine(`Warning: Could not stat ${relativePath}: ${err}`);
                }
            }

            // Determine files to upload (new or changed)
            const filesToUpload: Array<{ uri: vscode.Uri; relativePath: string; mtime: number }> = [];
            for (const [relativePath, { uri, mtime }] of localFilesByPath) {
                const existing = fileMetadata.get(relativePath);
                // Check if file is new or has changed (compare mtime with small tolerance for precision)
                const isNew = !existing;
                const hasChanged = existing && Math.abs(existing.mtime - mtime) > 1000; // 1 second tolerance
                
                if (isNew) {
                    outputChannel.appendLine(`File ${relativePath} is new, will upload`);
                    filesToUpload.push({ uri, relativePath, mtime });
                } else if (hasChanged) {
                    outputChannel.appendLine(`File ${relativePath} has changed (old mtime: ${existing.mtime}, new mtime: ${mtime}), will upload`);
                    filesToUpload.push({ uri, relativePath, mtime });
                } else {
                    outputChannel.appendLine(`File ${relativePath} is unchanged, skipping`);
                }
            }

            // Note: Files are not automatically deleted during sync.
            // Deletions only happen when the file watcher detects a file deletion and user confirms.

            outputChannel.appendLine(`Files to upload: ${filesToUpload.length}`);

            const totalOperations = filesToUpload.length;
            let completedOperations = 0;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing files to Gemini",
                cancellable: true
            }, async (progress, token) => {

                // Upload new or changed files
                for (const { uri, relativePath, mtime } of filesToUpload) {
                    if (token.isCancellationRequested) {
                        outputChannel.appendLine('Sync cancelled by user.');
                        break;
                    }

                    progress.report({ 
                        message: `Uploading ${relativePath}...`, 
                        increment: totalOperations > 0 ? 100 / totalOperations : 0 
                    });
                    outputChannel.appendLine(`Uploading ${relativePath}...`);

                    try {
                        const mimeType = getMimeType(uri.fsPath);
                        if (mimeType) {
                            // If file already exists in store, delete it first (only for changed files)
                            const existingDocName = storeDocumentsByDisplayName.get(relativePath);
                            if (existingDocName) {
                                try {
                                    await geminiService.deleteDocument(existingDocName);
                                    outputChannel.appendLine(`Deleted old version of ${relativePath} from store`);
                                } catch (err) {
                                    outputChannel.appendLine(`Warning: Could not delete old version of ${relativePath}: ${err}`);
                                }
                            }

                            await geminiService.uploadFile(storeName, uri.fsPath, mimeType, relativePath);
                            // Update metadata with new mtime (documentName will be updated below)
                            fileMetadata.set(relativePath, { mtime, documentName: '' });
                            outputChannel.appendLine(`Uploaded ${relativePath}`);
                            completedOperations++;
                        }
                    } catch (err) {
                        const errorMsg = `Failed to upload ${relativePath}: ${err}`;
                        console.error(errorMsg);
                        outputChannel.appendLine(errorMsg);
                    }
                }

                // Update metadata with current document names from store
                // This ensures all files (including unchanged ones) have correct documentName and mtime
                const updatedStoreDocuments = await geminiService.listDocuments(storeName);
                for (const doc of updatedStoreDocuments) {
                    if (doc.displayName) {
                        const localFile = localFilesByPath.get(doc.displayName);
                        if (fileMetadata.has(doc.displayName)) {
                            // Update existing metadata with document name and current mtime
                            const meta = fileMetadata.get(doc.displayName)!;
                            meta.documentName = doc.name;
                            if (localFile) {
                                meta.mtime = localFile.mtime; // Update mtime to current value
                            }
                        } else if (localFile) {
                            // File exists in store and locally but not in metadata - add it
                            fileMetadata.set(doc.displayName, {
                                mtime: localFile.mtime,
                                documentName: doc.name
                            });
                            outputChannel.appendLine(`Added missing metadata for ${doc.displayName}`);
                        }
                    }
                }

                // Save updated metadata
                await saveFileMetadata(currentProjectName, fileMetadata);
                outputChannel.appendLine(`Saved metadata for ${fileMetadata.size} files`);
            });

            const summary = `Sync complete. Uploaded ${filesToUpload.length} file(s).`;
            vscode.window.showInformationMessage(summary);
            outputChannel.appendLine(summary);

        } catch (error) {
            const errorMsg = `Failed to initialize Gemini Service: ${error}`;
            vscode.window.showErrorMessage(errorMsg);
            outputChannel.appendLine(errorMsg);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }

async function findFiles(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    const entries = await vscode.workspace.fs.readDirectory(folderUri);

    for (const [name, type] of entries) {
        const fullPath = vscode.Uri.joinPath(folderUri, name);
        if (type === vscode.FileType.Directory) {
            if (name !== 'node_modules' && !name.startsWith('.')) {
                files.push(...await findFiles(fullPath));
            }
        } else if (type === vscode.FileType.File) {
            if (getMimeType(name)) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function getMimeType(filePath: string): string | null {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'txt': return 'text/plain';
        case 'md': return 'text/markdown';
        case 'pdf': return 'application/pdf';
        case 'js': return 'text/javascript';
        case 'ts': return 'text/javascript'; // Gemini often treats TS as JS or plain text
        case 'py': return 'text/x-python';
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'csv': return 'text/csv';
        case 'json': return 'application/json';
        default: return null;
    }
}
