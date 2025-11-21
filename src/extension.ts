import * as vscode from 'vscode';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "gemini-file-sync" is now active!');

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

    const getProjectName = async (): Promise<string | undefined> => {
        let settings = await SettingsManager.loadSettings();
        let projectName = settings.projectName;

        if (!projectName) {
            projectName = await vscode.window.showInputBox({
                prompt: 'Enter a Project Name for Gemini File Sync',
                ignoreFocusOut: true,
                placeHolder: 'My Awesome Project'
            });
            if (projectName) {
                await SettingsManager.updateSetting('projectName', projectName);
            }
        }
        return projectName;
    };

    const getWatchLocation = async (): Promise<vscode.Uri | undefined> => {
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
                watchPath = folderResult[0].fsPath;
                await SettingsManager.updateSetting('watchLocation', watchPath);
            }
        }
        return watchPath ? vscode.Uri.file(watchPath) : undefined;
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
        outputChannel.appendLine(`Watching Location: ${watchUri.fsPath}`);
    }


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

        context.subscriptions.push(watcher.onDidChange(onFileChange));
        context.subscriptions.push(watcher.onDidCreate(onFileChange));
        context.subscriptions.push(watcher.onDidDelete(onFileChange));
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

            return [syncItem, projectItem, watchItem];
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
    }));

    context.subscriptions.push(vscode.commands.registerCommand('geminiFileSearch.changeWatchLocation', async () => {
        await SettingsManager.updateSetting('watchLocation', undefined); // Clear to force prompt
        await getWatchLocation();
        // Re-initialize watcher if needed (simplified: reload window hint or just update var)
        // For now, let's just notify user to reload or we can try to update the watcher dynamically
        // Dynamic update is better but let's stick to simple for now.
        vscode.window.showInformationMessage("Watch location updated. Reload window to apply watcher changes fully.");
        treeDataProvider.refresh();
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
            folderUri = vscode.Uri.file(storedWatchPath);
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

        // 3. Initialize File Manager
        try {
            const fileManager = new GoogleAIFileManager(apiKey);
            const currentProjectName = settings.projectName || 'Project';

            vscode.window.showInformationMessage(`Syncing files from ${folderUri.fsPath}...`);
            outputChannel.appendLine(`Selected folder: ${folderUri.fsPath}`);

            const files = await findFiles(folderUri);
            if (files.length === 0) {
                const msg = 'No supported files found to sync.';
                vscode.window.showInformationMessage(msg);
                outputChannel.appendLine(msg);
                return;
            }

            const totalFiles = files.length;
            let uploadedCount = 0;
            outputChannel.appendLine(`Found ${totalFiles} files to sync.`);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing files to Gemini",
                cancellable: true
            }, async (progress, token) => {
                for (const file of files) {
                    if (token.isCancellationRequested) {
                        outputChannel.appendLine('Sync cancelled by user.');
                        break;
                    }

                    const relativePath = vscode.workspace.asRelativePath(file);
                    // Construct display name with Project Name prefix
                    const displayName = `${currentProjectName}/${relativePath}`;

                    progress.report({ message: `Uploading ${relativePath}...`, increment: 100 / totalFiles });
                    outputChannel.appendLine(`Uploading ${relativePath} as ${displayName}...`);

                    try {
                        const mimeType = getMimeType(file.fsPath);
                        if (mimeType) {
                            const uploadResult = await fileManager.uploadFile(file.fsPath, {
                                mimeType: mimeType,
                                displayName: displayName
                            });
                            const msg = `Uploaded ${displayName} -> ${uploadResult.file.uri}`;
                            console.log(msg);
                            outputChannel.appendLine(msg);
                            uploadedCount++;
                        }
                    } catch (err) {
                        const errorMsg = `Failed to upload ${relativePath}: ${err}`;
                        console.error(errorMsg);
                        outputChannel.appendLine(errorMsg);
                    }
                }
            });

            const summary = `Sync complete. Uploaded ${uploadedCount}/${totalFiles} files.`;
            vscode.window.showInformationMessage(summary);
            outputChannel.appendLine(summary);

        } catch (error) {
            const errorMsg = `Failed to initialize Gemini File Manager: ${error}`;
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
