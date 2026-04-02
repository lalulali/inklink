"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
    console.log('Congratulations, your extension "inklink" is now active!');
    let disposable = vscode.commands.registerCommand('inklink.open', (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (targetUri) {
            InklinkPanel.createOrShow(context.extensionUri, targetUri, context);
        }
        else {
            vscode.window.showErrorMessage('No file selected.');
        }
    });
    context.subscriptions.push(disposable);
    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer('inklinkMap', {
            async deserializeWebviewPanel(webviewPanel, state) {
                if (state && state.fileUri) {
                    InklinkPanel.revive(webviewPanel, context.extensionUri, vscode.Uri.parse(state.fileUri), context);
                }
            }
        });
    }
}
function deactivate() { }
class InklinkPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _fileUri;
    _context;
    _disposables = [];
    static createOrShow(extensionUri, fileUri, context) {
        if (InklinkPanel.currentPanel) {
            InklinkPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        const fileName = fileUri.scheme === 'untitled' ? 'Untitled' : path.basename(fileUri.fsPath);
        const panel = vscode.window.createWebviewPanel('inklinkMap', `${fileName} (Mindmap)`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist/webview')],
            retainContextWhenHidden: true,
        });
        panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-light.svg'),
            dark: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-dark.svg')
        };
        InklinkPanel.currentPanel = new InklinkPanel(panel, extensionUri, fileUri, context);
    }
    static revive(panel, extensionUri, fileUri, context) {
        InklinkPanel.currentPanel = new InklinkPanel(panel, extensionUri, fileUri, context);
    }
    constructor(panel, extensionUri, fileUri, context) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._fileUri = fileUri;
        this._context = context;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openInEditor':
                    await vscode.window.showTextDocument(this._fileUri, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: false
                    });
                    return;
                case 'revealLine': {
                    const editor = await vscode.window.showTextDocument(this._fileUri, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: false
                    });
                    const line = message.line;
                    const pos = new vscode.Position(line, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                    return;
                }
                case 'ready':
                    this._sendInitialContent();
                    return;
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
        }, null, this._disposables);
        // Listen for editor selection changes to sync with webview
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor.document.uri.toString() === this._fileUri.toString()) {
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
    _respond(id, data, command = 'response') {
        this._panel.webview.postMessage({ command, id, data });
    }
    async _handleOpenFile(message) {
        const fileUri = await vscode.window.showOpenDialog({ filters: { 'Markdown': ['md', 'markdown'] } });
        if (fileUri && fileUri[0]) {
            const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
            this._respond(message.id, { file: { content, path: fileUri[0].fsPath } });
        }
    }
    async _handleSaveFile(message) {
        try {
            let targetPath = message.path || this._fileUri.fsPath;
            if (!message.path) {
                const saveUri = await vscode.window.showSaveDialog({ defaultUri: this._fileUri, filters: { 'Markdown': ['md'] } });
                if (saveUri)
                    targetPath = saveUri.fsPath;
                else
                    return this._respond(message.id, { result: { status: 'cancelled' } });
            }
            fs.writeFileSync(targetPath, message.content, 'utf8');
            this._respond(message.id, { result: { status: 'saved', file: { content: message.content, path: targetPath } } });
        }
        catch (err) {
            this._respond(message.id, { result: { status: 'error', message: String(err) } });
        }
    }
    // --- AUTO-SAVE HANDLERS ---
    async _handleSaveAutoSave(message) {
        const records = this._context.workspaceState.get('autosaves') || [];
        const newRecord = { ...message.record, id: message.record.id || Date.now().toString() };
        records.unshift(newRecord);
        await this._context.workspaceState.update('autosaves', records.slice(0, 50)); // Keep last 50
        this._respond(message.id, { success: true }, 'storageResponse');
    }
    async _handleLoadAutoSave(message) {
        const records = this._context.workspaceState.get('autosaves') || [];
        const record = message.id ? records.find(r => r.id === message.id) : records[0];
        this._respond(message.id, record || null, 'storageResponse');
    }
    async _handleListAutoSaves(message) {
        const records = this._context.workspaceState.get('autosaves') || [];
        this._respond(message.id, records, 'storageResponse');
    }
    async _handleDeleteAutoSave(message) {
        let records = this._context.workspaceState.get('autosaves') || [];
        records = records.filter(r => r.id !== message.id);
        await this._context.workspaceState.update('autosaves', records);
        this._respond(message.id, { success: true }, 'storageResponse');
    }
    async _handleClearAutoSaves(message) {
        await this._context.workspaceState.update('autosaves', []);
        this._respond(message.id, { success: true }, 'storageResponse');
    }
    dispose() {
        InklinkPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x)
                x.dispose();
        }
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    async _sendInitialContent() {
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
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to read file content: ${err}`);
        }
    }
    _getHtmlForWebview(webview) {
        const indexPath = vscode.Uri.joinPath(this._extensionUri, 'dist/webview', 'index.html');
        try {
            return fs.readFileSync(indexPath.fsPath, 'utf8');
        }
        catch (err) {
            return `<html><body>Error loading webview: ${err}</body></html>`;
        }
    }
}
//# sourceMappingURL=extension.js.map