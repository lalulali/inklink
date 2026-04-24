import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { globalState } from '@core/state/state-manager';
import { Canvas } from '@components/canvas';
import { Minimap } from '@components/minimap';
import { SearchPanel } from '@components/search-panel';
import { KeyboardHandler } from '@components/keyboard-handler';
import { Toolbar } from '@components/toolbar';
import { Toaster } from '@components/ui/toaster';
import { StatusBar } from '@components/status-bar';
import { WebPlatformProvider } from '@/platform/web/web-platform-context';
import { ThemeProvider } from 'next-themes';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';
import { AppReferenceDialog } from '@/components/app-reference-dialog';
import { ExportDialog } from '@/components/export-dialog';
import { SettingsDialog } from '@/components/settings-dialog';

// Polyfill process.env for libraries that expect it
if (typeof window !== 'undefined' && !window.process) {
    (window as any).process = { env: {} };
}

// CSS relative to the webview root
import './index.css';

import { getVsCodeApi } from '@platform/vscode';

import { ImageOverlay } from '@/components/image-overlay';

/**
 * VS Code Webview Entry Component
 * Reuses core Inklink components but connects to the extension host
 * instead of the local file system.
 */
const App = () => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Initialize VS Code API
        const vscode = getVsCodeApi();

        // Listen for messages from the extension host
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'setContent': {
                    const parser = createMarkdownParser();
                    let tree = null;
                    try {
                        tree = parser.parse(message.content);
                        ColorManager.assignBranchColors(tree);
                    } catch (e) {
                        // If empty, tree remains null which triggers the empty state UI
                        console.log('Inklink: Content is empty or invalid, showing empty state');
                    }

                    globalState.setState({ 
                        markdown: message.content,
                        tree: tree,
                        currentFile: { 
                            handle: undefined, 
                            path: message.fileName,
                            name: message.fileName.split('/').pop() || ''
                        }
                    });

                    // Save state for VS Code to restore after restart
                    vscode.setState({ fileUri: message.fileUri });
                    break;
                }
                case 'setLayout': {
                    globalState.setState({ layoutDirection: message.direction as any });
                    break;
                }
                case 'focusLine': {
                    const nodeId = `line_${message.line}`;
                    window.dispatchEvent(new CustomEvent('inklink-canvas-focus-node', { 
                        detail: { nodeId } 
                    }));
                    break;
                }
            }
        };

        const handleEditorToggleEvent = () => {
            vscode.postMessage({ command: 'openInEditor' });
        };

        const handleEditorRevealEvent = (e: any) => {
            const nodeId = e.detail.nodeId;
            if (nodeId && nodeId.startsWith('line_')) {
                const line = parseInt(nodeId.replace('line_', ''), 10);
                vscode.postMessage({ command: 'revealLine', line });
            }
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('inklink-editor-toggle', handleEditorToggleEvent);
        window.addEventListener('inklink-editor-reveal', handleEditorRevealEvent);

        // Signal to host that we are ready
        vscode.postMessage({ command: 'ready' });
        setIsReady(true);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('inklink-editor-toggle', handleEditorToggleEvent);
            window.removeEventListener('inklink-editor-reveal', handleEditorRevealEvent);
        };
    }, []);

    if (!isReady) return null;

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <WebPlatformProvider>
                <main className="vscode-webview flex w-full flex-col h-screen overflow-hidden bg-background text-foreground select-none">
                    {/* Toolbar for the webview (simplified or customized for VS Code) */}
                    <Toolbar 
                        onToggleEditor={() => {
                            const vscode = getVsCodeApi();
                            vscode.postMessage({ command: 'openInEditor' });
                        }} 
                        editorVisible={false} 
                    />
                    
                    <div className="relative flex-1 overflow-hidden">
                        {/* SVG Drawing Surface */}
                        <Canvas />
                        
                        {/* Overlays */}
                        <SearchPanel />
                        <Minimap />
                        <StatusBar />
                    </div>

                    <KeyboardHandler />
                    <Toaster />

                    {/* Dialogs and Drawers */}
                    <AppReferenceDialog />
                    <ExportDialog />
                    <SettingsDialog />
                    <ImageOverlay />
                </main>
            </WebPlatformProvider>
        </ThemeProvider>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
