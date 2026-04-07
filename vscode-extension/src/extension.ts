import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "inklink" is now active!');

    let disposable = vscode.commands.registerCommand('inklink.open', (uri?: vscode.Uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (targetUri) {
            InklinkPanel.createOrShow(context.extensionUri, targetUri, context);
        } else {
            vscode.window.showErrorMessage('No file selected.');
        }
    });

    context.subscriptions.push(disposable);

    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer('inklinkMap', {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                if (state && state.fileUri) {
                    InklinkPanel.revive(webviewPanel, context.extensionUri, vscode.Uri.parse(state.fileUri), context);
                }
            }
        });
    }
}

export function deactivate() {}

class InklinkPanel {
    private static readonly _panels = new Map<string, InklinkPanel>();
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _fileUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _revealDecoration: vscode.TextEditorDecorationType | undefined;
    private _isProgrammaticReveal: boolean = false;
    private _programmaticRevealTimeout: any;

    public static createOrShow(extensionUri: vscode.Uri, fileUri: vscode.Uri, context: vscode.ExtensionContext) {
        const fileUriString = fileUri.toString();
        const existingPanel = InklinkPanel._panels.get(fileUriString);

        if (existingPanel) {
            existingPanel._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        const fileName = fileUri.scheme === 'untitled' ? 'Untitled' : path.basename(fileUri.fsPath);
        const panel = vscode.window.createWebviewPanel(
            'inklinkMap',
            `${fileName} (Mindmap)`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist/webview')],
                retainContextWhenHidden: true,
            }
        );

        panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-light.svg'),
            dark: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-dark.svg')
        };

        const inklinkPanel = new InklinkPanel(panel, extensionUri, fileUri, context);
        InklinkPanel._panels.set(fileUriString, inklinkPanel);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fileUri: vscode.Uri, context: vscode.ExtensionContext) {
        const fileUriString = fileUri.toString();
        const inklinkPanel = new InklinkPanel(panel, extensionUri, fileUri, context);
        InklinkPanel._panels.set(fileUriString, inklinkPanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fileUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._fileUri = fileUri;
        this._context = context;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openInEditor':
                        await vscode.window.showTextDocument(this._fileUri, {
                            viewColumn: vscode.ViewColumn.One,
                            preserveFocus: false
                        });
                        return;
                    case 'revealLine': {
                        const lineNum = message.line;
                        const uriStr = this._fileUri.toString();

                        // Performance: Find if editor is already visible
                        let editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uriStr);
                        
                        if (!editor || editor.viewColumn !== vscode.ViewColumn.One) {
                            editor = await vscode.window.showTextDocument(this._fileUri, {
                                viewColumn: vscode.ViewColumn.One,
                                preserveFocus: false
                            });
                        } else {
                            // If it's already visible but not actively focused, focus it (reveals cursor)
                            if (vscode.window.activeTextEditor !== editor) {
                                await vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
                            }
                        }

                        if (editor) {
                            const line = editor.document.lineAt(lineNum);
                            const pos = new vscode.Position(lineNum, line.text.length);

                            // Guard: prevent selection-change listener from clearing the decoration
                            // when we are the ones programmatically moving the cursor.
                            this._isProgrammaticReveal = true;
                            if (this._programmaticRevealTimeout) {
                                clearTimeout(this._programmaticRevealTimeout);
                            }

                            // 1. Set cursor at end of line and scroll to top
                            editor.selection = new vscode.Selection(pos, pos);
                            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtTop);

                            // 2. Apply persistent yellow highlight (like Find)
                            // Dispose previous decoration if exists
                            if (this._revealDecoration) {
                                this._revealDecoration.dispose();
                            }

                            this._revealDecoration = vscode.window.createTextEditorDecorationType({
                                backgroundColor: 'rgba(255, 230, 0, 0.3)',
                                border: '1px solid rgba(255, 215, 0, 0.4)',
                                borderRadius: '2px',
                            });

                            // Detect bullet points to narrow down highlight to text only
                            const lineMatch = line.text.match(/^(\s*([-*+]|\d+\.)\s*(\[[ xX]\])?\s*)/);
                            const prefixLength = lineMatch ? lineMatch[0].length : 0;

                            editor.setDecorations(this._revealDecoration, [
                                new vscode.Range(lineNum, prefixLength, lineNum, line.text.length)
                            ]);

                            // 3. Release the guard after event loop completes so async selection events don't clear it
                            this._programmaticRevealTimeout = setTimeout(() => {
                                this._isProgrammaticReveal = false;
                            }, 50);
                        }
                        return;
                    }
                    case 'ready':
                        this._sendInitialContent();
                        return;
                    case 'openLink': {
                        if (message.url.startsWith('http://') || message.url.startsWith('https://') || message.url.startsWith('mailto:')) {
                            // Opens in default system browser
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        } else {
                            try {
                                let linkPath: string = message.url;
                                if (!path.isAbsolute(linkPath)) {
                                    linkPath = path.join(path.dirname(this._fileUri.fsPath), linkPath);
                                }
                                const targetUri = vscode.Uri.file(linkPath);
                                try {
                                    const doc = await vscode.workspace.openTextDocument(targetUri);
                                    // Open in the first column (original editing area), NOT the webview's column
                                    await vscode.window.showTextDocument(doc, { 
                                        viewColumn: vscode.ViewColumn.One, 
                                        preserveFocus: false 
                                    });
                                } catch {
                                    vscode.env.openExternal(targetUri);
                                }
                            } catch (e) {
                                console.error('openLink: failed to resolve path', e);
                            }
                        }
                        return;
                    }
                    case 'openFile':
                        await this._handleOpenFile(message);
                        return;
                    case 'saveFile':
                        await this._handleSaveFile(message);
                        return;
                    
                    // STORAGE COMMANDS
                    case 'saveAutoSave':
                        await this._handleSaveAutoSave(message);
                        return;
                    case 'loadAutoSave':
                        await this._handleLoadAutoSave(message);
                        return;
                    case 'listAutoSaves':
                        await this._handleListAutoSaves(message);
                        return;
                    case 'deleteAutoSave':
                        await this._handleDeleteAutoSave(message);
                        return;
                    case 'clearAllAutoSaves':
                        await this._handleClearAutoSaves(message);
                        return;
                    case 'savePreferences':
                        await this._context.globalState.update('preferences', message.prefs);
                        this._respond(message.id, { success: true }, 'storageResponse');
                        return;
                    case 'loadPreferences': {
                        const prefs = this._context.globalState.get('preferences');
                        this._respond(message.id, prefs || {}, 'storageResponse');
                        return;
                    }
                }
            },
            null,
            this._disposables
        );

        // Listen for editor selection changes to sync with webview and clear highlight
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor.document.uri.toString() === this._fileUri.toString()) {
                // Only clear the highlight if the user genuinely moved the cursor,
                // not when we set it ourselves during a programmatic reveal.
                if (!this._isProgrammaticReveal && this._revealDecoration) {
                    this._revealDecoration.dispose();
                    this._revealDecoration = undefined;
                }

                const line = e.selections[0].active.line;
                this._panel.webview.postMessage({
                    command: 'focusLine',
                    line: line
                });
            }
        }, null, this._disposables);

        // Listen for document changes to update webview in real-time
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === this._fileUri.toString()) {
                // Clear reveal highlight on typing
                if (this._revealDecoration) {
                    this._revealDecoration.dispose();
                    this._revealDecoration = undefined;
                }
                this._sendInitialContent();
            }
        }, null, this._disposables);

        // Listen for document saves
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.uri.toString() === this._fileUri.toString()) {
                this._sendInitialContent();
            }
        }, null, this._disposables);
    }

    private _respond(id: string, data: any, command: string = 'response') {
        this._panel.webview.postMessage({ command, id, data });
    }

    private async _handleOpenFile(message: any) {
        const fileUri = await vscode.window.showOpenDialog({ filters: { 'Markdown': ['md', 'markdown'] } });
        if (fileUri && fileUri[0]) {
            const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
            this._respond(message.id, { file: { content, path: fileUri[0].fsPath } });
        }
    }

    private async _handleSaveFile(message: any) {
        try {
            let targetPath = message.path || this._fileUri.fsPath;
            if (!message.path) {
                const saveUri = await vscode.window.showSaveDialog({ defaultUri: this._fileUri, filters: { 'Markdown': ['md'] } });
                if (saveUri) targetPath = saveUri.fsPath;
                else return this._respond(message.id, { result: { status: 'cancelled' } });
            }
            fs.writeFileSync(targetPath, message.content, 'utf8');
            this._respond(message.id, { result: { status: 'saved', file: { content: message.content, path: targetPath } } });
        } catch (err) {
            this._respond(message.id, { result: { status: 'error', message: String(err) } });
        }
    }

    // --- AUTO-SAVE HANDLERS ---
    private async _handleSaveAutoSave(message: any) {
        const records: any[] = this._context.workspaceState.get('autosaves') || [];
        const newRecord = { ...message.record, id: message.record.id || Date.now().toString() };
        records.unshift(newRecord);
        await this._context.workspaceState.update('autosaves', records.slice(0, 50)); // Keep last 50
        this._respond(message.id, { success: true }, 'storageResponse');
    }

    private async _handleLoadAutoSave(message: any) {
        const records: any[] = this._context.workspaceState.get('autosaves') || [];
        const record = message.id ? records.find(r => r.id === message.id) : records[0];
        this._respond(message.id, record || null, 'storageResponse');
    }

    private async _handleListAutoSaves(message: any) {
        const records = this._context.workspaceState.get('autosaves') || [];
        this._respond(message.id, records, 'storageResponse');
    }

    private async _handleDeleteAutoSave(message: any) {
        let records: any[] = this._context.workspaceState.get('autosaves') || [];
        records = records.filter(r => r.id !== message.id);
        await this._context.workspaceState.update('autosaves', records);
        this._respond(message.id, { success: true }, 'storageResponse');
    }

    private async _handleClearAutoSaves(message: any) {
        await this._context.workspaceState.update('autosaves', []);
        this._respond(message.id, { success: true }, 'storageResponse');
    }

    public dispose() {
        InklinkPanel._panels.delete(this._fileUri.toString());
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    private async _sendInitialContent() {
        try {
            // Use openTextDocument which handles untitled files and dirty buffers correctly
            const document = await vscode.workspace.openTextDocument(this._fileUri);
            const content = document.getText();
            const fileName = this._fileUri.scheme === 'untitled' ? 'Untitled' : path.basename(this._fileUri.fsPath);
            
            this._panel.webview.postMessage({
                command: 'setContent',
                content: content,
                fileName: fileName,
                fileUri: this._fileUri.toString()
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to read file content: ${err}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const indexPath = vscode.Uri.joinPath(this._extensionUri, 'dist/webview', 'index.html');
        try {
            return fs.readFileSync(indexPath.fsPath, 'utf8');
        } catch (err) {
            return `<html><body>Error loading webview: ${err}</body></html>`;
        }
    }
}
