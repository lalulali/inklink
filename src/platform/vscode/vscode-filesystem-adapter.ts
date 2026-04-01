import { getVsCodeApi } from './vscode-api';
import { FileSystemAdapter, FileContent, SaveResult } from '../adapters';

/**
 * VSCode File System Adapter Implementation
 * Bridges webview file operations to the extension host
 */
export class VSCodeFileSystemAdapter implements FileSystemAdapter {
  private vscode: any;
  private responseHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.vscode = getVsCodeApi();
    
    // Global listener for async responses from the host
    window.addEventListener('message', (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'response' && message.id) {
            const handler = this.responseHandlers.get(message.id);
            if (handler) {
                handler(message.data);
                this.responseHandlers.delete(message.id);
            }
        }
    });
  }

  /**
   * Generates a unique ID for request/response pairing
   */
  private generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  public async openFile(): Promise<FileContent> {
    const id = this.generateId();
    return new Promise((resolve, reject) => {
        this.responseHandlers.set(id, (data) => {
            if (data.error) {
                reject(new Error(data.error));
            } else {
                resolve(data.file);
            }
        });
        
        this.vscode.postMessage({
            command: 'openFile',
            id
        });
    });
  }

  public async saveFile(content: string, path?: string, handle?: any): Promise<SaveResult> {
    const id = this.generateId();
    return new Promise((resolve) => {
        this.responseHandlers.set(id, (data) => {
            resolve(data.result);
        });
        
        this.vscode.postMessage({
            command: 'saveFile',
            id,
            content,
            path,
            handle
        });
    });
  }

  public async getRecentFiles(): Promise<string[]> {
      const id = this.generateId();
      return new Promise((resolve) => {
          this.responseHandlers.set(id, (data) => {
              resolve(data.recentFiles || []);
          });
          
          this.vscode.postMessage({
              command: 'getRecentFiles',
              id
          });
      });
  }

  public async addRecentFile(path: string): Promise<void> {
      this.vscode.postMessage({
          command: 'addRecentFile',
          path
      });
  }
}
